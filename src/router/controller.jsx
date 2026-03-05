
const BACKEND_URL = "http://127.0.0.1:8000"

let returnBackend = async () => {
  let response = await fetch(BACKEND_URL)
  let data = response.json()

  console.log(data)
}


let runCommand = async (command) => {
  let response = await fetch(`${BACKEND_URL}/run-command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command: command })
  });

  let data = await response.json();
  console.log(data);
}

export { returnBackend, runCommand };