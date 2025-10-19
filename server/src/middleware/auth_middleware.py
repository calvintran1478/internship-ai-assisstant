import falcon
import datetime
from hmac import HMAC, compare_digest
from base64 import urlsafe_b64encode, urlsafe_b64decode
from hashlib import sha256

async def authenticate_user(req, resp, resource, params) -> None:
    req.context.user_id = None

    # Check authorization header is included
    auth_header = req.get_header("Authorization")
    if auth_header == None or len(auth_header) != 111:
        resp.status = falcon.HTTP_401
        return

    # Extract access token
    if not auth_header.startswith("Bearer "):
        resp.status = falcon.HTTP_401
        return
    access_token = auth_header[7:]

    # Parse access token into its two segments
    encoded_payload = access_token[:60].encode("utf-8")
    encoded_signature = access_token[60:].encode("utf-8")

    # Verify signature
    expected_encoded_signature = urlsafe_b64encode(HMAC(b"secret", encoded_payload, digestmod=sha256).digest())
    if not compare_digest(encoded_signature, expected_encoded_signature):
        resp.status = falcon.HTTP_401
        return

    # Decode payload claims
    decoded_payload = urlsafe_b64decode(encoded_payload)
    expiration_time = int.from_bytes(decoded_payload[36:], byteorder="big")
    if expiration_time < int(datetime.datetime.now(datetime.UTC).timestamp()):
        resp.status = falcon.HTTP_401
        return

    user_id = decoded_payload[:36].decode("utf-8")
    req.context.user_id = user_id
