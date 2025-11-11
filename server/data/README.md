# Data folder
## Folder structure 
This folder contains all of the data that we want our RAG pipeline to retrieve. There are 3 subfolders:
- `raw_data`: contains the raw data files (c.f. below for a detailed list).
- `processed_data`: contains the JSONL file with the processed data. Each of the files inside of this subfolder is versioned by the date of its creation to keep track of dataset progression. 
- `data_processing_notebooks`: contains the notebooks for 1) transforming the raw data -> processed data and 2) for creating the embeddings and adding them to a chroma database, which can be queried for similarity results.

## Raw data
The following files are currently added to the `raw_data` folder:
- Orientation week presentaton slides 
- Luki's slides, 4 different powerpoint files (as PDFs)
- MScAC handbook and calendar as of 4 Nov
- External internship proposal files: guide and form
- Job finding strategies workshop and web scraping tutorial slides

Additionally, additional websites were used as data sources as well. Some were scraped completely and some were simply added as a link. C.f. the `data_handling_notebook.ipynb` notebook for specifics.

## Data transformation and processing
#### PDFs
PDFs were processed using the `PyPDFLoader` class from the `langchain` package. The resulting text was cleaned (c.f. the notebook for specifics), merged and then split into 500 character chunks with an overlap of 100 characters using `RecursiveCharacterTextSplitter` from the langchain package.

#### PPTs
The powerpoint presentations were processed using the `Presentation` class from the pptx package. The resulting text was cleaned (c.f. the notebook for specifics), merged and then split into 500 character chunks with an overlap of 100 characters using `RecursiveCharacterTextSplitter` from the langchain package.

#### DocXs
The Word documents were processed usinig the `Document` class from the docx package. The resulting text was cleaned (c.f. the notebook for specifics), merged and then split into 500 character chunks with an overlap of 100 characters using `RecursiveCharacterTextSplitter` from the langchain package.

#### Calendar
The MScAC calendar ICS file was processed using the `Calendar` class from the ics package. Extracted events were converted to text and grouped by week.

#### Scraped webpages
Some webpages were scraped using the `BeautifulSoup` library. The resulting text then split into 500 character chunks with an overlap of 100 characters using `RecursiveCharacterTextSplitter` from the langchain package.

#### Additional MScAC resources
The additional resources and websites recommended by MScAC were directly input into the dataset within the notebook, where they were split in categories as indicated on the source page.

## Putting everything together
All text data was then put together in a list, rechunked for consistency and saved to JSONL file(s) in the `processed_data` folder.

## Creating embeddings
The embeddings for each of the text chunks was created using the `all-MiniLM-L6-v2` transformer model from HuggingFace. The model used for doing this doesn't really matter, this one was chosen in particular as it is compact and fast. 

The embeddings were then added to a Chroma database as a collection, which allows for easy querying. The next step is to run Chroma in [server-client mode](https://docs.trychroma.com/guides/deploy/client-server-mode) to have it interface with the chatbot.


$\textit{Last updated: 11 Nov 2025}$