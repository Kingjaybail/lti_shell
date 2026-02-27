import { useState } from "react";

// use export default to return the function to main
export default function Sample() {
  
  // status setter to handle state
  const [status, setStatus] = useState("Idle");

  // handlers for interactivity
  const handleClickMovie = () => setStatus("Playing!");
  const handleClickImage = () => setStatus("Uploading!");


  return (
    <div>
      {/* shows the status on display */}
      <p>Status: {status}</p>
      
      {/* interactivity objects (buttons in this case) use onClick to catch user input */}
      <button onClick={handleClickImage}>Upload Image</button>
      <button onClick={handleClickMovie}>Play Movie</button>
    </div>
  );
}