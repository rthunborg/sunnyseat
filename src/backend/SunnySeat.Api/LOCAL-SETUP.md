# Local Configuration Setup

## Setting Up Your Local Secrets

To run the application locally, you need to create a local configuration file with your secrets.

### Steps:

1. Copy the template file:
   ```
   copy src\backend\SunnySeat.Api\appsettings.Local.json.template src\backend\SunnySeat.Api\appsettings.Local.json
   ```

2. Edit `appsettings.Local.json` and replace the placeholder values with actual secrets:
   - Database Password
   - JWT Secret Key (minimum 32 characters)
   - OpenWeatherMap API Key

3. The `appsettings.Local.json` file is automatically ignored by Git and will never be committed.

### Configuration Loading Order

ASP.NET Core loads configuration in this order (later sources override earlier ones):
1. `appsettings.json`
2. `appsettings.{Environment}.json` (e.g., `appsettings.Development.json`)
3. `appsettings.Local.json` (your secrets - not in Git)

### Security Note

 **Never commit secrets to the repository!**

The `appsettings.Local.json` file is in `.gitignore` to prevent accidental commits of sensitive information.
