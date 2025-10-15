namespace SunnySeat.Shared.Constants;

/// <summary>
/// Admin role constants for authorization
/// </summary>
public static class Roles
{
    /// <summary>
    /// Standard admin role - can manage venues and patios
    /// </summary>
    public const string Admin = "Admin";

    /// <summary>
    /// Super admin role - can manage system configuration and other admins
    /// </summary>
    public const string SuperAdmin = "SuperAdmin";

    /// <summary>
    /// All admin roles
    /// </summary>
    public static readonly string[] All = { Admin, SuperAdmin };
}

/// <summary>
/// Authorization policy names
/// </summary>
public static class Policies
{
    /// <summary>
    /// Policy requiring Admin or SuperAdmin role
    /// </summary>
    public const string AdminOnly = "AdminOnly";

    /// <summary>
    /// Policy requiring SuperAdmin role only
    /// </summary>
    public const string SuperAdminOnly = "SuperAdminOnly";
}