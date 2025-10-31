import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router"; 
import "./index.css"

const HomePage = lazy(() => import("./pages/HomePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

render(
    () => (
        <Router root={(props) => <>{props.children}</>}>
            <Route path="/register" component={RegisterPage}/>
            <Route path="/home" component={HomePage}/>
        </Router>
    ),
    document.getElementById("root")!
);
