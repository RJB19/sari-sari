describe('Expenses Page', () => {
  beforeEach(() => {
    cy.loginAndWaitForDashboard();
    cy.visit('http://localhost:5173/expenses');
  });

  it('records an expense', () => {
    cy.contains('Add Expense').click();
    cy.get('input[placeholder="Description"]').type('Cypress Test Expense');
    cy.get('input[placeholder="Amount"]').type('150');
    cy.contains('Save').click();

    cy.contains('✅ Expense recorded').should('exist');
  });
});
