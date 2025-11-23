
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
