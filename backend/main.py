from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server import linux_simulation

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/message")
def read_hello():
    return {"message": "hello world"}


@app.get("/run-command")
def run_command():
    data = linux_simulation.run_command("ls")
    print(data)