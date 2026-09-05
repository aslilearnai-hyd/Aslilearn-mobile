# Script to replace lucide-react-native with @expo/vector-icons
$files = @(
    "app/dashboard.tsx",
    "app/ai-tutor.tsx",
    "app/learning-paths.tsx",
    "app/practice-tests.tsx",
    "app/profile.tsx",
    "app/quiz/[id].tsx",
    "app/subject/[id].tsx"
)

$iconReplacements = @{
    "BookOpen" = "book"
    "Play" = "play"
    "FileText" = "document-text"
    "BarChart3" = "bar-chart"
    "TrendingUp" = "trending-up"
    "Calendar" = "calendar"
    "Award" = "trophy"
    "Target" = "locate-outline"
    "Video" = "videocam"
    "MessageSquare" = "chatbubble"
    "ChevronRight" = "chevron-forward"
    "ArrowLeft" = "arrow-back"
    "Send" = "send"
    "Bot" = "chatbubbles"
    "User" = "person"
    "Users" = "people"
    "Star" = "star"
    "CheckCircle" = "checkmark-circle"
    "XCircle" = "close-circle"
    "Clock" = "time"
    "Eye" = "eye"
    "EyeOff" = "eye-off"
    "Mail" = "mail"
    "Lock" = "lock-closed"
    "Settings" = "settings"
    "LogOut" = "log-out"
}

Write-Host "Icon replacement script - run manually for each file"






