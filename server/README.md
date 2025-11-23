
# Getting Started

## Building Dependencies

Install [poetry](https://python-poetry.org/docs/) on your system if it is not installed already. The server dependencies can then be installed using
```bash
poetry install
```
Alternatively, you can create a virtual environment within the server directory using
```bash
python -m venv server-env
```
Now activate your environment with the following command:
```bash
source server-env/bin/activate
```
Finally, install the package requirements using pip.
```bash
pip install -r requirements.txt
```

## Setting up Environment Variables

Move to the server/src directory and create a .env file with the following contents
```
DB_CONNECTION=(...)

API_SECRET=(...)

MISTRAL_API_KEY=(...)

AWS_ACCESS_KEY_ID=(...)
AWS_ENDPOINT_URL_S3=(...)
AWS_REGION=(...)
AWS_SECRET_ACCESS_KEY=(...)
BUCKET_NAME=(...)

SERVER_DOMAIN=(...)
ALLOW_ORIGINS=(...)
```
DB_CONNECTION should be a connection string to a running Postgres database. API_SECRET should be a secret string known only by you (the one running the server), and is used for authentication. The Mistral and AWS variables should be those gained from creating a model and S3 instance using those respective services. The server domain and allowed origins should be the domain of the server and client, respectively. If the app is running on localhost, these can be set to "http://localhost:8000" and "*".

## Starting the Server

You can start the server by entering the following command in the server/src directory.
```bash
poetry run uvicorn server:app
```
If you created the virtual environment manually, this can be done using
```bash
uvicorn server:app
```
To exit the virtual environment simply run
```bash
deactivate
```
