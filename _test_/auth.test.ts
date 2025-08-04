import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInButton } from "@/components/auth/SignInButton";
import { signIn } from "next-auth/react";

jest.mock("next-auth/react");

describe("SignInButton", () => {
  it("renders sign in button", () => {
    render(<SignInButton />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("opens dialog when button is clicked", () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
  });

  it("calls signIn with google when Google button is clicked", async () => {
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
    render(<SignInButton />);
    fireEvent.click(screen.getByText("Sign In"));
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/dashboard",
      });
    });
  });

  it("calls signIn with github when GitHub button is clicked", async () => {
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
    render(<SignInButton />);
    fireEvent.click(screen.getByText("Sign In"));
    fireEvent.click(screen.getByText("Continue with GitHub"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("github", {
        callbackUrl: "/dashboard",
      });
    });
  });
});
