import React from "react";

export default class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(err) {
    return { err };
  }
  state = { err: null };

  render() {
    if (this.state.err !== null) {
      return (
        <div
          style={{
            height: "100%",
            width: "100%",
            border: "solid red",
            borderWidth: 2
          }}
        >
          {this.state.err.message}
        </div>
      );
    }
    return this.props.children;
  }
}
