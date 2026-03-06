import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080c14]">
        <div className="max-w-md mx-4 bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-8 text-center">
          <div className="text-red-400 text-2xl mb-3">Something went wrong</div>
          <p className="text-slate-400 text-sm mb-2">
            The application encountered an unexpected error.
          </p>
          <p className="text-slate-600 text-xs font-mono mb-6 break-all">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors cursor-pointer"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}
