import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Leaf, Mail } from "lucide-react";
import "./team-buy.css";

const TeamBuyConfirmation = () => {
  const [searchParams] = useSearchParams();

  const details = useMemo(() => {
    const orderId = searchParams.get("order_id") || `GG-${Date.now().toString().slice(-6)}`;
    const teamName = searchParams.get("team") || "GrapeGuard Team";
    const buyerName = searchParams.get("buyer") || "Team Admin";
    const email = searchParams.get("email") || "team@example.com";
    const plan = searchParams.get("plan") || "Team Pro";
    const seats = searchParams.get("seats") || "10";
    const amount = searchParams.get("amount") || "4999";

    return { orderId, teamName, buyerName, email, plan, seats, amount };
  }, [searchParams]);

  const confirmationDate = new Date().toLocaleString();
  const mailSubject = `GrapeGuard AI | Team Buy Confirmation (${details.orderId})`;

  return (
    <div className="team-buy-root">
      <div className="team-buy-wrap">
        <div className="team-buy-card">
          <div className="team-buy-brand">
            <span className="team-buy-logo">
              <Leaf size={18} />
            </span>
            <p>
              Grape<span>Guard</span> AI
            </p>
          </div>

          <div className="team-buy-state">
            <CheckCircle2 size={20} />
            <span>Team buy completed successfully</span>
          </div>

          <h1>Purchase Confirmation</h1>
          <p className="team-buy-sub">Your team subscription is now active. A confirmation email has been sent.</p>

          <div className="team-buy-grid">
            <div>
              <label>Order ID</label>
              <p>{details.orderId}</p>
            </div>
            <div>
              <label>Team</label>
              <p>{details.teamName}</p>
            </div>
            <div>
              <label>Plan</label>
              <p>{details.plan}</p>
            </div>
            <div>
              <label>Seats</label>
              <p>{details.seats}</p>
            </div>
            <div>
              <label>Total Amount</label>
              <p>Rs {details.amount}</p>
            </div>
            <div>
              <label>Confirmed At</label>
              <p>{confirmationDate}</p>
            </div>
          </div>
        </div>

        <div className="team-buy-mail">
          <div className="team-buy-mail-head">
            <Mail size={18} />
            <span>Email Confirmation Preview</span>
          </div>
          <div className="team-buy-mail-body">
            <p>
              <strong>To:</strong> {details.email}
            </p>
            <p>
              <strong>Subject:</strong> {mailSubject}
            </p>
            <hr />
            <p>Hello {details.buyerName},</p>
            <p>
              Thank you for purchasing <strong>{details.plan}</strong> for <strong>{details.teamName}</strong> on
              GrapeGuard AI.
            </p>
            <p>
              Order <strong>{details.orderId}</strong> is confirmed with <strong>{details.seats} seats</strong>.
            </p>
            <p>Total paid: Rs {details.amount}</p>
            <p>You can now sign in and start using your team workspace.</p>
            <p>Regards,</p>
            <p>GrapeGuard AI Team</p>
          </div>
          <Link to="/login" className="team-buy-cta">
            Continue to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeamBuyConfirmation;
