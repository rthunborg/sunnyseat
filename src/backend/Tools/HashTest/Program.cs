var password = "password";
var hash = BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt(12));
Console.WriteLine($"Generated Hash: {hash}");

var testHash = "$2a$10$N9qo8uLOickgx2ZMRZoMye.HRjSBJhvz1UX7E5JLh1tU3X3rqm7uK";
var verify = BCrypt.Net.BCrypt.Verify(password, testHash);
Console.WriteLine($"Verify existing hash: {verify}");

var verify2 = BCrypt.Net.BCrypt.Verify(password, hash);
Console.WriteLine($"Verify new hash: {verify2}");
