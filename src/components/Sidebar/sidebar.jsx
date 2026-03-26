import "./sidebar.css";
import "../../router/controller";

// here is where assignment will be populated
export default function Sidebar() {
  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">Assignment</h2>
        <p className="sidebarSub">Course</p>
      </header>

      <div className="sidebarBody">
        Given an array of length n, create a python program that will remove duplicate values from the given array. <br/><br/>

        Example array: <br/><br/>
        nums = [10, 99, 10, 12, 4]<br/><br/>

        result = [10, 99, 12, 4]
      </div>

      <footer className="sidebarFooter">
      </footer>
    </aside>
  );
}