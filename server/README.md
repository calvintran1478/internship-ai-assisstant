
# Getting Started

## Building Dependencies

Create a python virtual environment in the server directory.
```bash
python -m venv falcon-env
```
Now activate your environment with the following command.
```bash
source falcon-env/bin/activate
```
Install the package requirements using pip.
```bash
pip install -r requirements.txt
```

## Starting the Server

Ensure your virtual environment is active. You can start the server by entering the following command in the server/src directory.
```bash
uvicorn server:app
```
