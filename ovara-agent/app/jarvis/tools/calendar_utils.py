"""
Utility functions for Google Calendar integration.
"""

import json
import os
from datetime import datetime
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Define scopes needed for Google Calendar
SCOPES = ["https://www.googleapis.com/auth/calendar"]

# Path for token storage - check Docker environment first
DOCKER_TOKEN_PATH = os.getenv("CALENDAR_TOKEN_PATH")
if DOCKER_TOKEN_PATH and Path(DOCKER_TOKEN_PATH).exists():
    TOKEN_PATH = Path(DOCKER_TOKEN_PATH)
else:
    TOKEN_PATH = Path(os.path.expanduser("~/.credentials/calendar_token.json"))

# Get the absolute path to credentials.json in the ovara-agent root directory
# This file should be located in the same directory as the main app
OVARA_AGENT_ROOT = Path(__file__).parent.parent.parent.parent  # Go up from tools/jarvis/app/ovara-agent
CREDENTIALS_PATH = OVARA_AGENT_ROOT / "credentials.json"


def get_calendar_service():
    """
    Authenticate and create a Google Calendar service object.

    Returns:
        A Google Calendar service object or None if authentication fails
    """
    creds = None

    try:
        # Check if token exists and is valid
        if TOKEN_PATH.exists():
            try:
                creds = Credentials.from_authorized_user_info(
                    json.loads(TOKEN_PATH.read_text()), SCOPES
                )
            except Exception as e:
                print(f"Error loading existing credentials: {e}")
                # Continue to try other authentication methods

        # If credentials don't exist or are invalid, refresh or get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception as e:
                    print(f"Error refreshing credentials: {e}")
                    return None
            else:
                # If credentials.json doesn't exist, we can't proceed with OAuth flow
                if not CREDENTIALS_PATH.exists():
                    print(
                        f"Google Calendar unavailable: {CREDENTIALS_PATH.absolute()} not found."
                    )
                    print(f"Current working directory: {os.getcwd()}")
                    print(f"Looking for credentials at: {CREDENTIALS_PATH.absolute()}")
                    return None

                # In a server environment, we can't run interactive OAuth flow
                # Return None and let the calling function handle the error gracefully
                print("Google Calendar unavailable: Interactive OAuth flow not available in server environment.")
                return None

            # Save the credentials for the next run
            try:
                TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
                TOKEN_PATH.write_text(creds.to_json())
            except Exception as e:
                print(f"Warning: Could not save credentials: {e}")

        # Create and return the Calendar service
        try:
            return build("calendar", "v3", credentials=creds)
        except Exception as e:
            print(f"Error building calendar service: {e}")
            return None

    except Exception as e:
        print(f"Google Calendar unavailable: {e}")
        return None


def format_event_time(event_time):
    """
    Format an event time into a human-readable string.

    Args:
        event_time (dict): The event time dictionary from Google Calendar API

    Returns:
        str: A human-readable time string
    """
    if "dateTime" in event_time:
        # This is a datetime event
        dt = datetime.fromisoformat(event_time["dateTime"].replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %I:%M %p")
    elif "date" in event_time:
        # This is an all-day event
        return f"{event_time['date']} (All day)"
    return "Unknown time format"


def parse_datetime(datetime_str):
    """
    Parse a datetime string into a datetime object.

    Args:
        datetime_str (str): A string representing a date and time

    Returns:
        datetime: A datetime object or None if parsing fails
    """
    formats = [
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %I:%M %p",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%Y",
        "%B %d, %Y %H:%M",
        "%B %d, %Y %I:%M %p",
        "%B %d, %Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(datetime_str, fmt)
        except ValueError:
            continue

    return None


def get_current_time() -> dict:
    """
    Get the current time and date
    """
    now = datetime.now()

    # Format date as MM-DD-YYYY
    formatted_date = now.strftime("%m-%d-%Y")

    return {
        "current_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "formatted_date": formatted_date,
    }
