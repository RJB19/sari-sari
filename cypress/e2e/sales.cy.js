describe('Sales Page', () => {
  beforeEach(() => {
    cy.loginAndWaitForDashboard();
    cy.visit('http://localhost:5173/sales');
  });

  it('records a sale', () => {
    cy.contains('Record Sale').click();
    cy.get('select').first().select(1); // Update this if you have actual product names
    cy.get('input[placeholder="Quantity"]').type('1');
    cy.contains('Save Sale').click();

    cy.contains('✅ Sale recorded').should('exist');
  });
});
    