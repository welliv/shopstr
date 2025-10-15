import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CountdownBadge from "../countdown-badge";
import usePrefersReducedMotion from "@/components/hooks/use-prefers-reduced-motion";

jest.mock("@/components/hooks/use-prefers-reduced-motion");

const mockUsePrefersReducedMotion =
  usePrefersReducedMotion as unknown as jest.Mock;

describe("CountdownBadge", () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders a default overlay badge", () => {
    render(<CountdownBadge secondsRemaining={3600} />);
    const badge = screen.getByText(/Expires in/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-live", "polite");
    expect(badge).toHaveClass("inline-flex", { exact: false });
    expect(badge).toHaveTextContent("Expires in 1h 0m");
  });

  it("applies urgent styling when below the threshold", () => {
    render(<CountdownBadge secondsRemaining={60} />);
    const badge = screen.getByText(/Expires in/i);
    expect(badge.className).toContain("bg-red-600");
  });

  it("returns null when expired", () => {
    const { container } = render(
      <CountdownBadge secondsRemaining={0} isExpired />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("rounds updates for reduced motion preferences", () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);
    render(<CountdownBadge secondsRemaining={75} />);
    const badge = screen.getByText("Expires in 2m");
    expect(badge).toHaveAttribute("aria-live", "off");
    expect(badge).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Approximately 2 minutes")
    );
  });
});
