describe('Login Test', () => {
  it('should log in and redirect to dashboard', () => {
cy.visit('http://localhost:5173/login');

cy.get('input[placeholder="Email"]').type('chie@test.com');
cy.get('input[placeholder="Password"]').type('Test@1234');
cy.get('button[type="submit"]').click();

// Wait for redirect and data loading
cy.url().should('include', '/dashboard');
cy.wait(3000); // ✅ give time for Supabase + page render

  });
});
