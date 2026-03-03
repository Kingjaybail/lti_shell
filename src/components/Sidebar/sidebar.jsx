import "./sidebar.css";
import "../../router/controller";

// here is where assignment will be populated
export default function Sidebar() {
  
  const returnBackend = async () => {
    let response = await fetch('http://127.0.0.1:8000/message')
    let data = await response.json()


    console.log(data)
    return data
  }

  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">Assignment</h2>
        <p className="sidebarSub">Course</p>
      </header>

      <div className="sidebarBody">
        Given an array of length n, create a c program that will remove duplicate values from the given array. <br/><br/>

        Example array: <br/><br/>
        nums = [10, 99, 10, 12, 4]<br/><br/>

        result = [10, 99, 12, 4]
        <br></br>
        <button onClick={() => returnBackend()}>Test</button>
      </div>

      <footer className="sidebarFooter">
      </footer>
    </aside>
  );
}
