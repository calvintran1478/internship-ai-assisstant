import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router"; 
import "./index.css"

const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

render(
    () => (
        <Router root={(props) => <>{props.children}</>}>
            <Route path={["/", "/home"]} component={HomePage}/>
            <Route path="/register" component={RegisterPage}/>
            <Route path="/login" component={LoginPage}/>
            <Route path="/profile" component={ProfilePage}/>
        </Router>
    ),
    document.getElementById("root")!
);
