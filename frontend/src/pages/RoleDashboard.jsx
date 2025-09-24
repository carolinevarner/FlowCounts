import TopBar from "../components/TopBar";
import { getMenu } from "../components/RoleNav";

export default function RoleDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const menu = getMenu(user.role);
  const pretty =
    user.role === "ADMIN" ? "Admins" :
    user.role === "MANAGER" ? "Managers" :
    user.role === "ACCOUNTANT" ? "Accountants" : "User";

  return (
    <>
      <TopBar menu={menu} user={user} />
      <div style={{ padding: "32px" }}>
        <h1>{pretty} HomePage</h1>
      </div>
    </>
  );
}
