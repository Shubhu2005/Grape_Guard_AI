from datetime import datetime


def build_team_buy_confirmation_email(payload: dict) -> dict:
    subject = f"GrapeGuard AI | Team Buy Confirmation ({payload['order_id']})"
    confirmed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    html = f"""
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; background:#f6f8f6; margin:0; padding:20px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table width="620" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; border:1px solid #dde6dd; overflow:hidden;">
            <tr>
              <td style="background:#1f6d2c; color:#ffffff; padding:18px 20px; font-weight:700; font-size:20px;">
                GrapeGuard AI
              </td>
            </tr>
            <tr>
              <td style="padding:20px; color:#1d2a1d;">
                <p style="margin:0 0 12px;">Hello {payload['buyer_name']},</p>
                <p style="margin:0 0 14px;">
                  Your team purchase is confirmed. Thank you for choosing <strong>GrapeGuard AI</strong>.
                </p>
                <table width="100%" cellspacing="0" cellpadding="8" style="border:1px solid #e2e9e2; border-radius:8px;">
                  <tr><td><strong>Order ID</strong></td><td>{payload['order_id']}</td></tr>
                  <tr><td><strong>Team</strong></td><td>{payload['team_name']}</td></tr>
                  <tr><td><strong>Plan</strong></td><td>{payload['plan_name']}</td></tr>
                  <tr><td><strong>Seats</strong></td><td>{payload['seats']}</td></tr>
                  <tr><td><strong>Total</strong></td><td>Rs {payload['amount']}</td></tr>
                  <tr><td><strong>Confirmed At</strong></td><td>{confirmed_at}</td></tr>
                </table>
                <p style="margin:16px 0 0;">
                  You can now login and start using your team workspace.
                </p>
                <p style="margin:16px 0 0;">Regards,<br/>GrapeGuard AI Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
""".strip()

    return {
        "to": payload["email"],
        "subject": subject,
        "html": html,
    }
