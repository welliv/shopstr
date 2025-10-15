import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import usePrefersReducedMotion from "../use-prefers-reduced-motion";

describe("usePrefersReducedMotion", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.resetAllMocks();
  });

  const renderHookComponent = () => {
    const TestComponent = () => {
      const prefers = usePrefersReducedMotion();
      return <span data-testid="prefers">{prefers ? "true" : "false"}</span>;
    };

    return render(<TestComponent />);
  };

  it("returns false when matchMedia is unavailable", () => {
    // @ts-expect-error intentionally removing matchMedia for the test
    delete window.matchMedia;

    renderHookComponent();

    expect(screen.getByTestId("prefers")).toHaveTextContent("false");
  });

  it("subscribes to media query changes via addEventListener", () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const addEventListener = jest.fn(
      (_event: string, cb: (event: MediaQueryListEvent) => void) => {
        listener = cb;
      }
    );
    const removeEventListener = jest.fn();

    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener,
      removeEventListener,
      addListener: undefined,
      removeListener: undefined,
      onchange: null,
      dispatchEvent: jest.fn(),
    }));

    renderHookComponent();
    expect(screen.getByTestId("prefers")).toHaveTextContent("false");

    act(() => {
      listener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(screen.getByTestId("prefers")).toHaveTextContent("true");

    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("falls back to legacy addListener APIs", () => {
    let legacyListener: ((event: MediaQueryListEvent) => void) | undefined;
    const addListener = jest.fn((cb: (event: MediaQueryListEvent) => void) => {
      legacyListener = cb;
    });
    const removeListener = jest.fn();

    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener,
      removeListener,
      onchange: null,
      dispatchEvent: jest.fn(),
    }));

    const { unmount } = renderHookComponent();

    act(() => {
      legacyListener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(screen.getByTestId("prefers")).toHaveTextContent("true");

    unmount();

    expect(removeListener).toHaveBeenCalledWith(expect.any(Function));
  });
});
