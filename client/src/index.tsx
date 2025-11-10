import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router"; 
import "./index.css"

export const apiDomain = "https://server-rough-fire-7678.fly.dev";

const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

render(
    () => (
        <Router base="/internship-ai-assisstant" root={(props) => <>{props.children}</>}>
            <Route path={["/", "/home"]} component={HomePage}/>
            <Route path="/register" component={RegisterPage}/>
            <Route path="/login" component={LoginPage}/>
            <Route path="/profile" component={ProfilePage}/>
        </Router>
    ),
    document.getElementById("root")!
);
