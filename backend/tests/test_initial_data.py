"""Tests for app/initial_data.py"""

import runpy
from unittest.mock import MagicMock, patch


def test_init_calls_init_db() -> None:
    """init() should open a Session and call init_db with it."""
    mock_session = MagicMock()
    mock_context = MagicMock()
    mock_context.__enter__ = MagicMock(return_value=mock_session)
    mock_context.__exit__ = MagicMock(return_value=False)

    with (
        patch(
            "app.initial_data.Session", return_value=mock_context
        ) as mock_session_cls,
        patch("app.initial_data.init_db") as mock_init_db,
    ):
        from app.initial_data import init

        init()

        mock_session_cls.assert_called_once()
        mock_init_db.assert_called_once_with(mock_session)


def test_main_calls_init() -> None:
    """main() should call init() and log start/end messages."""
    with patch("app.initial_data.init") as mock_init:
        from app.initial_data import main

        main()
        mock_init.assert_called_once()


def test_main_guard_runs_main() -> None:
    """Running initial_data as __main__ executes main() via the __main__ guard."""
    mock_session = MagicMock()
    mock_context = MagicMock()
    mock_context.__enter__ = MagicMock(return_value=mock_session)
    mock_context.__exit__ = MagicMock(return_value=False)

    with (
        patch("sqlmodel.Session", return_value=mock_context),
        patch("app.core.db.init_db"),
    ):
        runpy.run_module("app.initial_data", run_name="__main__")
