import os
import boto3
from botocore.client import Config

class S3Middleware:
    def __init__(self):
        self.client = None

    async def process_startup(self, scope, event):
        self.client = boto3.client(
            "s3",
            endpoint_url=os.getenv("AWS_ENDPOINT_URL_S3"),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            config=Config(s3={"addressing_style": "virtual"})
        )

    async def process_request(self, req, resp):
        req.context.s3_client = self.client
