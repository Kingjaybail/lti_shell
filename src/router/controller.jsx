
let returnBackend = async () => {
  let response = await fetch('http://127.0.0.1:8000')
  let data = response.json()

  console.log(data)
}

