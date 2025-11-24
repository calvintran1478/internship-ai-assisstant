import os
import os.path as op
import json
from typing import List, Dict, Tuple

import numpy as np
import torch
import faiss
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig
)
from peft import PeftModel

# RAG constants
EMBED_MODEL_NAME = "BAAI/bge-large-en-v1.5"
MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
ADAPTER_DIR = op.join(op.dirname(__file__), "..", "rag")
JSONL_PATH = op.join(op.dirname(__file__), "..", "..", "data", "processed_data", "rag_ready_docs_20251123.jsonl")
INDEX_PATH = op.join(op.dirname(__file__), "..", "..", "data", "faiss", "faiss_index.bin")
CORPUS_PATH = op.join(op.dirname(__file__), "..", "rag", "corpus_meta.json")
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


# RAG helper functions 
def clean_text(raw_text: str) -> str:
    text = raw_text

    # Remove leading "page_content='"
    if text.startswith("page_content='"):
        text = text[len("page_content='"):]
        if text.endswith("'"):
            text = text[:-1]

    # Remove trailing metadata blob if present
    if " metadata={'" in text:
        text = text.split(" metadata={'", 1)[0]

    # Clean whitespace
    text = text.replace("\\n", " ").replace("\n", " ")
    text = " ".join(text.split())

    return text


def load_corpus(jsonl_path: str):
    docs = []
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            obj = json.loads(line)

            text = clean_text(obj.get("text", ""))
            if not text:
                continue

            docs.append({
                "id": obj.get("id", ""),
                "text": text,
                "metadata": obj.get("metadata", {}),
            })

    print(f"Loaded {len(docs)} chunks from dataset.")
    return docs

def build_embeddings(docs: List[Dict], model_name: str) -> np.ndarray:
    model = SentenceTransformer(model_name)
    texts = [d["text"] for d in docs]
    prefixed = [QUERY_PREFIX + t for t in texts]

    embeddings = model.encode(
        prefixed,
        batch_size=32,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    print("Embeddings shape:", embeddings.shape)
    return embeddings


def build_faiss_hnsw(embeddings: np.ndarray) -> faiss.Index:
    dim = embeddings.shape[1]
    index = faiss.IndexHNSWFlat(dim, 32)
    index.hnsw.efConstruction = 200
    index.hnsw.efSearch = 64

    index.add(embeddings)
    print("FAISS index size:", index.ntotal)
    return index

MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
TOP_K = 8
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def build_chatml_prompt(system_prompt: str, user_prompt: str) -> str:
    """
    Build a ChatML-style prompt for Qwen:
      <|im_start|>system
      ...
      <|im_end|>
      <|im_start|>user
      ...
      <|im_end|>
      <|im_start|>assistant
      ... (model continues)
    """
    return (
        "<|im_start|>system\n" + system_prompt + "<|im_end|>\n"
        "<|im_start|>user\n" + user_prompt + "<|im_end|>\n"
        "<|im_start|>assistant\n"
    )


class RAGEngine:
    def __init__(self,
                 index_path: str,
                 corpus_path: str,
                 embed_model_name: str,
                 model_name: str,
                 use_lora_adapter: str = None):
        # Load index and corpus.
        print("Loading FAISS index and corpus...")
        self.index = faiss.read_index(index_path)
        with open(corpus_path, "r", encoding="utf-8") as f:
            self.corpus = json.load(f)

        # Embedding model.
        print("Loading embedding model:", embed_model_name)
        self.embed_model = SentenceTransformer(embed_model_name)

        # Tokenizer.
        print("Loading tokenizer:", model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            use_fast=True,
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # 4-bit quantization config for T4.
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

        print("Loading Qwen model in 4-bit...")
        base_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
        )

        # Attach LoRA adapter if provided.
        if use_lora_adapter is not None:
            print("Attaching LoRA adapter from:", use_lora_adapter)
            self.model = PeftModel.from_pretrained(
                base_model,
                use_lora_adapter,
                torch_dtype=torch.bfloat16,
                device_map="auto",
            )
        else:
            self.model = base_model

        self.model.eval()

    def embed_query(self, query: str) -> np.ndarray:
        text = QUERY_PREFIX + query
        emb = self.embed_model.encode(
            [text],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return emb

    def retrieve(self, query: str, k: int = TOP_K) -> List[Dict]:
        q_emb = self.embed_query(query)
        D, I = self.index.search(q_emb, k)

        results = []
        for idx, score in zip(I[0], D[0]):
            doc = self.corpus[idx]
            results.append({
                "id": doc["id"],
                "text": doc["text"],
                "metadata": doc.get("metadata", {}),
                "score": float(score),
            })
        return results

    def build_prompt(self, query: str, contexts: List[Dict]) -> str:
        context_lines = []
        for i, c in enumerate(contexts, start=1):
            meta_str = ", ".join(f"{k}={v}" for k, v in c.get("metadata", {}).items())
            context_lines.append(
                f"[{i}] (id={c['id']}, {meta_str})\n{c['text']}\n"
            )
        context_block = "\n\n".join(context_lines)

        # 2 different system instructions tried:
        # system_instruction = (
        #     "You are an MScAC interview mentor at the University of Toronto. "
        #     "Use ONLY the provided context to answer. If something is not in the context, "
        #     "say you are not sure and suggest asking the MScAC office or the official website.\n"
        #     "Your response MUST follow this structure:\n"
        #     "1. Direct Answer\n"
        #     "2. How to Prepare (numbered steps)\n"
        #     "3. Sources (bullet list of [chunk-id] you used)\n"
        # )
        system_instruction = (
            "You are a knowledgeable and supportive career coach for MScAC students seeking internships. " 
            "Your role is to provide personalized guidance on technical and behavioral interview questions, resume feedback, and career advice. "
            "Be constructive, encouraging, and clear, offering actionable tips that help students improve their chances of securing internships. "
            "When answering coding questions, give explanations that teach the reasoning behind solutions, not just the answers."
            "Use the provided context ONLY IF relevant to the user's prompt. Otherwise, rely on your own knowledge."
        )

        user_message = (
            f"Question: {query}\n\n"
            f"Context:\n{context_block}\n"
        )

        prompt = build_chatml_prompt(system_instruction, user_message)
        return prompt

    @torch.no_grad()
    def answer(self, query: str, max_new_tokens: int = 512) -> Tuple[str, List[Dict]]:
        contexts = self.retrieve(query, TOP_K)
        prompt = self.build_prompt(query, contexts)

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=4096,
        ).to(DEVICE)

        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=self.tokenizer.eos_token_id,
        )

        generated = outputs[0, inputs["input_ids"].shape[1]:]
        text = self.tokenizer.decode(generated, skip_special_tokens=True)
        return text, contexts