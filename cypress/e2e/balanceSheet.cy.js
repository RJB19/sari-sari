describe('Balance Sheet Page', () => {
  beforeEach(() => {
    cy.loginAndWaitForDashboard();
    cy.visit('http://localhost:5173/balance-sheet');
  });

  it('shows financial summary', () => {
    cy.contains('Statement of Financial Position').should('exist');
    cy.contains('Assets').should('exist');
    cy.contains('Liabilities + Equity').should('exist');
  });
});
