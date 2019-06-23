import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

let render = () => {
  let App = require("./App").default;
  ReactDOM.render(<App />, document.getElementById("root"));
};

render();

if (module.hot) {
  module.hot.accept("./App", render);
}
