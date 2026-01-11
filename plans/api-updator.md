### SLICE 1

okay next let's add a generator that will add CRUD routes for specified data models in a nest api. here's what it needs to do:

0. run db:generate to ensure contracts are up-to-date
1. run nest generate resource
2. update DTOs. DTOs come directly from contracts. You'll need to ensure that the CreateDTO and update DTO are compliant with prisma conditions.
   2.5 Entities need slight updates, you'll just implement the contract there. nothing more is needed
3. update the controller with nestjs/swagger annotations. We want an ApiTag for each controller. and all responses should be annotated like this:
   @ApiCreatedResponse({ type: <ContractName> })
   Basically, you'll be using the contract from the contracts in the database package to easily ensure type safety.
4. update the services to use prisma

### SLICE 2

1. add a helper
