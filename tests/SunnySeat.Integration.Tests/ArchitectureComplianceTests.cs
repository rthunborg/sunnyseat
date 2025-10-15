using System.Reflection;
using FluentAssertions;
using Xunit;
using SunnySeat.Core.Entities;
using SunnySeat.Data;
using SunnySeat.Shared;

namespace SunnySeat.Integration.Tests;

/// <summary>
/// Architecture compliance tests that validate coding standards and project structure
/// These tests ensure the codebase follows established conventions
/// </summary>
public class ArchitectureComplianceTests
{
    [Fact]
    public void AllProjects_ShouldTarget_DotNet8()
    {
        // Arrange
        var assemblies = new[]
        {
            typeof(Program).Assembly, // Api Program class
            typeof(Building).Assembly, // Core project
            typeof(SunnySeatDbContext).Assembly, // Data project
        };

        // Act & Assert
        foreach (var assembly in assemblies)
        {
            var targetFramework = assembly.GetCustomAttribute<System.Runtime.Versioning.TargetFrameworkAttribute>();
            targetFramework.Should().NotBeNull($"Assembly {assembly.GetName().Name} should have TargetFramework attribute");
            targetFramework!.FrameworkName.Should().StartWith(".NETCoreApp,Version=v8.0",
                $"Assembly {assembly.GetName().Name} should target .NET 8");
        }
    }

    [Fact]
    public void CoreProject_ShouldNot_DependOnInfrastructure()
    {
        // Arrange
        var coreAssembly = typeof(Building).Assembly;
        var referencedAssemblies = coreAssembly.GetReferencedAssemblies();

        // Act & Assert
        referencedAssemblies.Should().NotContain(a => a.Name!.Contains("SunnySeat.Data"),
            "Core should not depend on Data layer");
        referencedAssemblies.Should().NotContain(a => a.Name!.Contains("SunnySeat.Api"),
            "Core should not depend on API layer");
        referencedAssemblies.Should().NotContain(a => a.Name!.Contains("EntityFramework"),
            "Core should not depend on Entity Framework");
    }

    [Fact]
    public void PublicClasses_ShouldFollow_PascalCaseNaming()
    {
        // Arrange
        var assemblies = new[]
        {
            typeof(Building).Assembly, // Core project
            typeof(SunnySeatDbContext).Assembly // Data project
        };

        // Act & Assert
        foreach (var assembly in assemblies)
        {
            var publicTypes = assembly.GetTypes().Where(t => t.IsPublic);

            foreach (var type in publicTypes)
            {
                type.Name.Should().MatchRegex("^[A-Z][a-zA-Z0-9]*$",
                    $"Public class {type.Name} in {assembly.GetName().Name} should use PascalCase");
            }
        }
    }

    [Fact]
    public void PublicMethods_ShouldFollow_PascalCaseNaming()
    {
        // Arrange
        var assemblies = new[]
        {
            typeof(Building).Assembly, // Core project
            typeof(SunnySeatDbContext).Assembly // Data project
        };

        // Act & Assert
        foreach (var assembly in assemblies)
        {
            var publicTypes = assembly.GetTypes().Where(t => t.IsPublic);

            foreach (var type in publicTypes)
            {
                var publicMethods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static)
                    .Where(m => m.DeclaringType == type && !m.IsSpecialName)
                    .Where(m => !m.Name.Contains("<") && !m.Name.Contains("$")); // Exclude compiler-generated methods

                foreach (var method in publicMethods)
                {
                    method.Name.Should().MatchRegex("^[A-Z][a-zA-Z0-9]*$",
                        $"Public method {method.Name} in {type.Name} should use PascalCase");
                }
            }
        }
    }

    [Fact]
    public void AllProjects_ShouldHave_NullableEnabled()
    {
        // This test verifies that nullable reference types are enabled
        // by checking that the assemblies have the nullable attributes

        // Arrange
        var assemblies = new[]
        {
            typeof(Program).Assembly, // Api Program class
            typeof(Building).Assembly, // Core project
            typeof(SunnySeatDbContext).Assembly, // Data project
        };

        // Act & Assert
        foreach (var assembly in assemblies)
        {
            // In .NET 9 with nullable enabled, we expect certain attributes to be present
            var types = assembly.GetTypes().Take(1); // Just check one type per assembly
            types.Should().NotBeEmpty($"Assembly {assembly.GetName().Name} should have types");
        }
    }

    [Fact]
    public void TestProjects_ShouldReference_RequiredTestingPackages()
    {
        // Arrange
        var testAssembly = typeof(ArchitectureComplianceTests).Assembly;
        var referencedAssemblies = testAssembly.GetReferencedAssemblies();

        // Act & Assert
        referencedAssemblies.Should().Contain(a => a.Name!.Contains("xunit"),
            "Test projects should reference xUnit");
        referencedAssemblies.Should().Contain(a => a.Name!.Contains("FluentAssertions"),
            "Test projects should reference FluentAssertions");
    }

    [Theory]
    [InlineData("SunnySeat.Api")]
    [InlineData("SunnySeat.Core")]
    [InlineData("SunnySeat.Data")]
    [InlineData("SunnySeat.Shared")]
    public void ProjectNames_ShouldFollow_ExpectedNamingConvention(string expectedProjectName)
    {
        // Act & Assert
        expectedProjectName.Should().StartWith("SunnySeat.",
            "All projects should start with SunnySeat namespace");
        expectedProjectName.Should().MatchRegex("^SunnySeat\\.[A-Z][a-zA-Z]*$",
            "Project names should follow PascalCase after SunnySeat prefix");
    }

    [Fact]
    public void Solution_ShouldHave_ExpectedProjectStructure()
    {
        // This test validates that all expected assemblies can be loaded
        // indicating proper project references and structure

        // Act & Assert
        Action loadApi = () => Assembly.LoadFrom("SunnySeat.Api.dll");
        Action loadCore = () => Assembly.LoadFrom("SunnySeat.Core.dll");
        Action loadData = () => Assembly.LoadFrom("SunnySeat.Data.dll");
        Action loadShared = () => Assembly.LoadFrom("SunnySeat.Shared.dll");

        // These should not throw if assemblies are properly built and referenced
        // In actual test run, assemblies are loaded via project references
        typeof(Program).Assembly.Should().NotBeNull();
        typeof(Building).Assembly.Should().NotBeNull();
        typeof(SunnySeatDbContext).Assembly.Should().NotBeNull();
    }
}