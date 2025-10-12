
# Getting Started

## Building Dependencies

Install [poetry](https://python-poetry.org/docs/) on your system if it is not installed already. The server dependencies can then be installed using
```bash
poetry install
```

## Starting the Server

You can start the server by entering the following command in the server/src directory.
```bash
poetry run uvicorn server:app
```
