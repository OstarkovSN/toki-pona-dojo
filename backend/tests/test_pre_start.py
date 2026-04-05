"""Tests for app/tests_pre_start.py and app/backend_pre_start.py"""

import runpy
from unittest.mock import MagicMock, patch

from sqlalchemy import Engine


class TestTestsPreStart:
    def test_init_succeeds_with_working_db(self) -> None:
        """init() should succeed when session.exec() works fine."""
        from app.tests_pre_start import init

        mock_engine = MagicMock(spec=Engine)
        mock_session = MagicMock()
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch("app.tests_pre_start.Session", return_value=mock_context):
            # Should not raise
            init(mock_engine)

        mock_session.exec.assert_called_once()

    def test_init_retries_on_exception(self) -> None:
        """init() should retry when session raises an exception, then succeed."""
        from app.tests_pre_start import init

        mock_engine = MagicMock(spec=Engine)

        call_count = 0
        mock_session_ok = MagicMock()
        mock_session_fail = MagicMock()
        mock_session_fail.exec.side_effect = Exception("DB not ready")

        def make_context(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            ctx = MagicMock()
            if call_count == 1:
                ctx.__enter__ = MagicMock(return_value=mock_session_fail)
            else:
                ctx.__enter__ = MagicMock(return_value=mock_session_ok)
            ctx.__exit__ = MagicMock(return_value=False)
            return ctx

        with patch("app.tests_pre_start.Session", side_effect=make_context):
            # Should succeed on the second attempt
            init(mock_engine)

        assert call_count == 2

    def test_main_calls_init(self) -> None:
        """main() in tests_pre_start should call init() with the engine."""
        with patch("app.tests_pre_start.init") as mock_init:
            from app.tests_pre_start import main

            main()
            mock_init.assert_called_once()

    def test_main_guard_runs_main(self) -> None:
        """Running tests_pre_start as __main__ calls main() which calls init().

        runpy.run_module re-executes the module in a fresh namespace. We patch
        Session in the module so that init() succeeds without touching the DB,
        verifying the __main__ guard triggers main() -> init() without retries.
        """
        mock_session = MagicMock()
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch("app.tests_pre_start.Session", return_value=mock_context):
            runpy.run_module("app.tests_pre_start", run_name="__main__")


class TestBackendPreStart:
    def test_init_succeeds_with_working_db(self) -> None:
        """init() should succeed when session.exec() works fine."""
        from app.backend_pre_start import init

        mock_engine = MagicMock(spec=Engine)
        mock_session = MagicMock()
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch("app.backend_pre_start.Session", return_value=mock_context):
            init(mock_engine)

        mock_session.exec.assert_called_once()

    def test_init_retries_on_exception(self) -> None:
        """init() should retry when session raises an exception, then succeed."""
        from app.backend_pre_start import init

        mock_engine = MagicMock(spec=Engine)

        call_count = 0
        mock_session_ok = MagicMock()
        mock_session_fail = MagicMock()
        mock_session_fail.exec.side_effect = Exception("DB not ready")

        def make_context(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            ctx = MagicMock()
            if call_count == 1:
                ctx.__enter__ = MagicMock(return_value=mock_session_fail)
            else:
                ctx.__enter__ = MagicMock(return_value=mock_session_ok)
            ctx.__exit__ = MagicMock(return_value=False)
            return ctx

        with patch("app.backend_pre_start.Session", side_effect=make_context):
            init(mock_engine)

        assert call_count == 2

    def test_main_calls_init(self) -> None:
        """main() in backend_pre_start should call init() with the engine."""
        with patch("app.backend_pre_start.init") as mock_init:
            from app.backend_pre_start import main

            main()
            mock_init.assert_called_once()

    def test_main_guard_runs_main(self) -> None:
        """Running backend_pre_start as __main__ calls main() which calls init().

        runpy.run_module re-executes the module in a fresh namespace. We patch
        Session in the module so that init() succeeds without touching the DB,
        verifying the __main__ guard triggers main() -> init() without retries.
        """
        mock_session = MagicMock()
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch("app.backend_pre_start.Session", return_value=mock_context):
            runpy.run_module("app.backend_pre_start", run_name="__main__")
