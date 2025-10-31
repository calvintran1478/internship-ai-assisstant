import os
import falcon
import botocore
from middleware.auth_middleware import authenticate_user

@falcon.before(authenticate_user)
class ResumeResource:

    def key_exists(self, bucket, key, s3_client) -> bool:
        try:
            s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except botocore.exceptions.ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            else:
                raise

    async def on_put(self, req, resp):
        # Get user
        if req.context.user_id == None:
            return

        # Read in resume bytes from request body
        resume_data = await req.stream.readall()

        # Check if the user already has a resume uploaded
        resume_id = f"{req.context.user_id}/resume"
        resume_exists = self.key_exists(os.getenv("BUCKET_NAME"), resume_id, req.context.s3_client)

        # Upload resume to S3
        req.context.s3_client.put_object(Body=resume_data, Bucket=os.getenv("BUCKET_NAME"), Key=resume_id)

        resp.status = falcon.HTTP_204 if resume_exists else falcon.HTTP_201
