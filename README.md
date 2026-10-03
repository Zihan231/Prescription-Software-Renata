
  # Create design

  This is a code bundle for Create design. The original project is available at https://www.figma.com/design/BUQaqNYAPnOrPlQJTlZ1Dv/Create-design.

  ## Running the code

  Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Medicine catalogue

The current medicine catalogue is generated from `medicine_information_export.csv` and contains 40,836 unique DAR registrations. After importing `database/oncology_schema.sql`, load it with:

```sh
mysql -u root -p oncology_db < database/medicine_information_import.sql
```

The catalogue import replaces the existing contents of the `medicines` table.
