export const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400&family=DM+Sans:wght@300;400&display=swap');
`;

export const styles = `
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  * { box-sizing: border-box; }
  input::placeholder, select option[disabled] { color: rgba(255,255,255,0.25) !important; }
  select option { background: #1b2735; color: #fff; }
  .active\\:scale-98:active { transform: scale(0.98); }
  .loader {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 1.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;