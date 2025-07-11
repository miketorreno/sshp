# TODO

## Bug

- [ ] UI
  - [ ] When fetched date & datetime fields get changed, it doesn't reflect in the UI
  - [ ] When dropdown fields get changed, it doesn't reflect in the UI
  - [ ] Update UI when orders get deleted
  - [ ] Make all dropdowns full width
  - [ ] Sidebar: make lab, medication & imaging non-collapsible
  - [ ] Use badges for statuses
  - [ ] Change "Loading..." to better UX
- [ ] DB
  - [ ] remove optional User fields from all tables, when you're done with the user module
  - [ ] Change appointment field: reason to notes
- [ ] Good design
  - [ ] Write good toast & alert messages (say to specific patient) and Personalize them
  - [ ] extract common helpers (like: handleChange) to a separate file
- [ ] Security
  - [ ] Swap all `console.log or console.error` with `log` like: Pino
  - [ ] Add `required` attribute to all input fields with `*`
  - [ ] Use bcrypt for password hashing
  - [ ] Implement JWT for authentication
