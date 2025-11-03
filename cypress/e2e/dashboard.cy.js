describe('Dashboard Overview', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/login');
    cy.get('input[placeholder="Email"]').type('chie@test.com');
    cy.get('input[placeholder="Password"]').type('Test@1234');
    cy.get('button[type="submit"]').click();
  });

  it('displays dashboard items', () => {
    cy.url().should('include', '/dashboard');
    cy.contains('Sales').should('exist');
    cy.contains('Expenses').should('exist');
    cy.contains('Balance Sheet').should('exist');
  });
});
