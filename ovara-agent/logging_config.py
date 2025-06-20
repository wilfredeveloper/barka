"""
Logging configuration for Ovara Agent to filter out verbose Google ADK logs
"""

import logging


class SystemInstructionFilter(logging.Filter):
    """Filter to remove only the System Instruction sections that clutter terminal."""

    def __init__(self):
        super().__init__()
        self.in_system_instruction = False

    def filter(self, record):
        message = str(record.getMessage())

        # Check if we're entering a system instruction block
        if "System Instruction:" in message:
            self.in_system_instruction = True
            return False

        # Check if we're exiting a system instruction block
        if self.in_system_instruction and "-----------------------------------------------------------" in message:
            self.in_system_instruction = False
            return False

        # Filter out messages while we're inside a system instruction block
        if self.in_system_instruction:
            return False

        return True


def setup_clean_logging():
    """Setup logging that shows all logs except System Instruction sections."""

    # Create custom formatter for our logs
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'  # Shorter timestamp format
    )

    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Clear existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler with our filter
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.addFilter(SystemInstructionFilter())
    root_logger.addHandler(console_handler)

    # Keep all loggers at INFO level (show everything except system instructions)
    # We don't want to suppress other Google ADK logs, just the system instructions

    # Keep our application logs at INFO level
    app_loggers = ['main', '__main__', 'ovara', 'barka']
    for logger_name in app_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.INFO)


def setup_debug_logging():
    """Setup logging with full debug output (for troubleshooting)."""
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


if __name__ == "__main__":
    # Test the logging configuration
    setup_clean_logging()

    # Test various log messages
    logger = logging.getLogger(__name__)
    logger.info("This should appear - application log")

    google_logger = logging.getLogger('google.adk')
    google_logger.info("This should appear - Google ADK log")

    httpx_logger = logging.getLogger('httpx')
    httpx_logger.info("HTTP Request: POST https://example.com - This should appear")

    # Test system instruction filtering
    system_logger = logging.getLogger('google.adk.models.google_llm')
    system_logger.info("System Instruction: This should be filtered")
    system_logger.info("Some system content here")
    system_logger.info("-----------------------------------------------------------")
    system_logger.info("This should appear again after the separator")
