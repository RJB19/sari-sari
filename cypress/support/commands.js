// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
// cypress/support/commands.js

Cypress.Commands.add('loginAndWaitForDashboard', () => {
  cy.visit('http://localhost:5173/login');

  cy.get('input[placeholder="Email"]').type('chie@test.com');
  cy.get('input[placeholder="Password"]').type('Test@1234');
  cy.get('button[type="submit"]').click();

  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');

  // Wait for dashboard content to render
 //  cy.contains('Sales Revenue', { timeout: 10000 }).should('be.visible');
});


//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })