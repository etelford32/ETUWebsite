# 🎮 Game Feedback API Integration Guide

This guide shows how to integrate the feedback system into your game client (Unity, Godot, Unreal, etc.).

## API Endpoint

```
POST https://yoursite.com/api/feedback
GET  https://yoursite.com/api/feedback (requires auth)
```

## Authentication

The feedback API supports **both authenticated and anonymous submissions**:

- ✅ **Authenticated**: Include `Authorization: Bearer {token}` header
- ✅ **Anonymous**: No auth required (useful for demo players)

## POST - Submit Feedback

### Request Format

```typescript
// Headers
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {supabase_access_token}" // Optional
}

// Body
{
  "type": "bug" | "feature" | "suggestion" | "support" | "other",
  "title": "Brief summary (3-200 chars)",
  "description": "Detailed description (10+ chars)",
  "email": "optional@email.com", // Optional
  "source": "game", // or "web"
  "metadata": { // Optional - add game-specific data
    "game_version": "0.1.2",
    "platform": "PC",
    "scene": "asteroid_field_01",
    "error_stack": "...",
    "player_level": 15,
    "ship_type": "interceptor"
  }
}
```

### Response

**Success (201):**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "feedback": {
    "id": "uuid-here",
    "type": "bug",
    "status": "open",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error (400/500):**
```json
{
  "error": "Error message here"
}
```

## GET - Retrieve User's Feedback

Requires authentication.

### Query Parameters

- `status` - Filter by status (open, in_progress, resolved, closed)
- `type` - Filter by type (bug, feature, suggestion, support, other)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)

### Example Request

```
GET /api/feedback?status=open&type=bug&page=1&pageSize=10
Authorization: Bearer {supabase_access_token}
```

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "bug",
      "title": "Ship collision glitch",
      "description": "...",
      "status": "open",
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

## Implementation Examples

### Unity (C#)

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

public class FeedbackManager : MonoBehaviour
{
    private const string API_URL = "https://yoursite.com/api/feedback";

    [System.Serializable]
    public class FeedbackData
    {
        public string type;
        public string title;
        public string description;
        public string email;
        public string source = "game";
        public Metadata metadata;
    }

    [System.Serializable]
    public class Metadata
    {
        public string game_version;
        public string platform;
        public string scene;
        public string error_stack;
    }

    public void SubmitBugReport(string title, string description, string errorStack = null)
    {
        StartCoroutine(SubmitFeedback(new FeedbackData
        {
            type = "bug",
            title = title,
            description = description,
            metadata = new Metadata
            {
                game_version = Application.version,
                platform = Application.platform.ToString(),
                scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name,
                error_stack = errorStack
            }
        }));
    }

    private IEnumerator SubmitFeedback(FeedbackData feedback)
    {
        string json = JsonUtility.ToJson(feedback);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        using (UnityWebRequest request = new UnityWebRequest(API_URL, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            // Optional: Add auth token if user is logged in
            string token = PlayerPrefs.GetString("supabase_token", "");
            if (!string.IsNullOrEmpty(token))
            {
                request.SetRequestHeader("Authorization", $"Bearer {token}");
            }

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Feedback submitted successfully!");
                // Show success UI
            }
            else
            {
                Debug.LogError($"Failed to submit feedback: {request.error}");
                // Show error UI
            }
        }
    }
}

// Usage in your game code:
public class GameManager : MonoBehaviour
{
    public FeedbackManager feedbackManager;

    void OnApplicationQuit()
    {
        // Example: Auto-submit crash report
        if (HasUnhandledError)
        {
            feedbackManager.SubmitBugReport(
                "Game crash on exit",
                "The game crashed unexpectedly during shutdown",
                lastErrorStack
            );
        }
    }
}
```

### Godot (GDScript)

```gdscript
extends Node

const API_URL = "https://yoursite.com/api/feedback"

func submit_bug_report(title: String, description: String) -> void:
    var feedback_data = {
        "type": "bug",
        "title": title,
        "description": description,
        "source": "game",
        "metadata": {
            "game_version": ProjectSettings.get_setting("application/config/version"),
            "platform": OS.get_name(),
            "scene": get_tree().current_scene.name
        }
    }

    var http_request = HTTPRequest.new()
    add_child(http_request)
    http_request.connect("request_completed", self, "_on_feedback_submitted")

    var headers = ["Content-Type: application/json"]

    # Optional: Add auth token if user is logged in
    var token = get_supabase_token() # Your auth function
    if token:
        headers.append("Authorization: Bearer " + token)

    var json = JSON.print(feedback_data)
    http_request.request(API_URL, headers, true, HTTPClient.METHOD_POST, json)

func _on_feedback_submitted(result, response_code, headers, body):
    if response_code == 201:
        print("Feedback submitted successfully!")
        show_success_notification()
    else:
        print("Failed to submit feedback: ", response_code)
        show_error_notification()
```

### JavaScript/TypeScript (for web builds)

```typescript
interface FeedbackMetadata {
  game_version?: string;
  platform?: string;
  scene?: string;
  error_stack?: string;
  [key: string]: any;
}

interface SubmitFeedbackParams {
  type: 'bug' | 'feature' | 'suggestion' | 'support' | 'other';
  title: string;
  description: string;
  email?: string;
  metadata?: FeedbackMetadata;
}

async function submitFeedback(params: SubmitFeedbackParams): Promise<boolean> {
  const { type, title, description, email, metadata } = params;

  try {
    // Get auth token from Supabase client
    const { data: { session } } = await supabase.auth.getSession();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type,
        title,
        description,
        email,
        source: 'game',
        metadata: {
          ...metadata,
          game_version: '0.1.2',
          platform: navigator.platform,
          user_agent: navigator.userAgent,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit feedback');
    }

    const result = await response.json();
    console.log('Feedback submitted:', result.feedback.id);
    return true;

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return false;
  }
}

// Usage
submitFeedback({
  type: 'bug',
  title: 'Ship physics glitch',
  description: 'Ship passes through asteroids at high velocity',
  metadata: {
    scene: 'asteroid_field_01',
    ship_velocity: 150.5,
    collision_count: 3,
  }
});
```

## In-Game UI Examples

### Simple Feedback Button

```csharp
// Unity UI Button
public void OnFeedbackButtonClick()
{
    // Show feedback form
    feedbackPanel.SetActive(true);
}

public void OnSubmitFeedback()
{
    string type = feedbackTypeDropdown.value switch {
        0 => "bug",
        1 => "feature",
        2 => "suggestion",
        _ => "other"
    };

    feedbackManager.SubmitFeedback(
        type,
        titleInput.text,
        descriptionInput.text
    );

    feedbackPanel.SetActive(false);
    ShowSuccessToast("Thank you for your feedback!");
}
```

### Automatic Crash Reporting

```csharp
public class CrashReporter : MonoBehaviour
{
    private FeedbackManager feedbackManager;

    void Awake()
    {
        feedbackManager = GetComponent<FeedbackManager>();
        Application.logMessageReceived += HandleLog;
    }

    void HandleLog(string logString, string stackTrace, LogType type)
    {
        if (type == LogType.Error || type == LogType.Exception)
        {
            feedbackManager.SubmitBugReport(
                $"Automatic Error Report: {type}",
                $"Error: {logString}\n\nStack Trace:\n{stackTrace}",
                stackTrace
            );
        }
    }
}
```

## Rate Limiting

Consider implementing client-side rate limiting:
- Max 5 feedback submissions per minute
- Max 20 feedback submissions per day
- Cache failed submissions and retry later

```csharp
public class FeedbackRateLimiter
{
    private Queue<DateTime> recentSubmissions = new Queue<DateTime>();
    private const int MAX_PER_MINUTE = 5;

    public bool CanSubmit()
    {
        // Remove submissions older than 1 minute
        while (recentSubmissions.Count > 0 &&
               (DateTime.Now - recentSubmissions.Peek()).TotalMinutes > 1)
        {
            recentSubmissions.Dequeue();
        }

        return recentSubmissions.Count < MAX_PER_MINUTE;
    }

    public void RecordSubmission()
    {
        recentSubmissions.Enqueue(DateTime.Now);
    }
}
```

## Best Practices

1. **Don't spam**: Implement rate limiting on the client side
2. **Include context**: Always send game version, scene, and relevant state
3. **Validate locally**: Check input before sending to API
4. **Handle offline**: Queue feedback if no internet connection
5. **User privacy**: Don't send personally identifiable info without consent
6. **Anonymous option**: Allow players to submit feedback without signing in
7. **Progress indicator**: Show loading state while submitting
8. **Success feedback**: Confirm submission with a thank you message

## Testing

Test the API with curl:

```bash
# Anonymous submission
curl -X POST https://yoursite.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug",
    "title": "Test bug report",
    "description": "This is a test bug report from the game",
    "source": "game",
    "metadata": {
      "game_version": "0.1.0",
      "platform": "PC"
    }
  }'

# Authenticated submission
curl -X POST https://yoursite.com/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "feature",
    "title": "Add multiplayer mode",
    "description": "Would love to play with friends!",
    "source": "game"
  }'
```

## Security Notes

- ✅ API validates all input server-side
- ✅ SQL injection protection via Supabase
- ✅ XSS protection via input sanitization
- ✅ Rate limiting recommended
- ✅ Anonymous submissions allowed (for demos)
- ✅ User ID automatically extracted from auth token (can't be spoofed)

## Support

For issues or questions:
- Check the console logs for detailed error messages
- Verify your API URL is correct
- Ensure Content-Type header is set to application/json
- Check network connectivity
- Verify Supabase credentials if using authentication

---

Happy integrating! 🚀
