using Microsoft.AspNetCore.SignalR;

namespace SunnySeat.Api.Hubs;

/// <summary>
/// SignalR hub for real-time accuracy metrics updates
/// </summary>
public class AccuracyMetricsHub : Hub
{
    /// <summary>
    /// Called when a client connects to the hub
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the hub
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
