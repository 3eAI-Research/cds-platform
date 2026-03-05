import { Component, type ErrorInfo, type ReactNode } from "react";
import { Result, Button } from "antd";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Etwas ist schiefgelaufen"
          subTitle={
            this.state.error?.message || "Ein unerwarteter Fehler ist aufgetreten."
          }
          extra={[
            <Button key="retry" type="primary" onClick={this.handleReset}>
              Erneut versuchen
            </Button>,
            <Button key="home" onClick={() => (window.location.href = "/")}>
              Zur Startseite
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}
