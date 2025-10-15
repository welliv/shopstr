import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import useCurrentUnixTime, {
  __resetUnixTimeStoresForTests,
} from "../use-current-unix-time";

describe("useCurrentUnixTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    __resetUnixTimeStoresForTests();
    jest.restoreAllMocks();
  });

  it("shares a single timer across subscribers", () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const TestComponent = () => {
      const first = useCurrentUnixTime();
      const second = useCurrentUnixTime();
      return (
        <>
          <span data-testid="first">{first}</span>
          <span data-testid="second">{second}</span>
        </>
      );
    };

    const { unmount } = render(<TestComponent />);

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    const baseTimestamp = Math.floor(Date.now() / 1000);
    expect(screen.getByTestId("first")).toHaveTextContent(
      baseTimestamp.toString()
    );
    expect(screen.getByTestId("second")).toHaveTextContent(
      baseTimestamp.toString()
    );

    act(() => {
      jest.advanceTimersByTime(1500);
      jest.setSystemTime(new Date((baseTimestamp + 1) * 1000));
    });

    expect(screen.getByTestId("first")).toHaveTextContent(
      (baseTimestamp + 1).toString()
    );
    expect(screen.getByTestId("second")).toHaveTextContent(
      (baseTimestamp + 1).toString()
    );

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("does not start a timer when disabled", () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");

    const TestComponent = () => {
      const timestamp = useCurrentUnixTime({ isEnabled: false });
      return <span data-testid="timestamp">{timestamp}</span>;
    };

    render(<TestComponent />);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
