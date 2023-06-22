"""Unit tests for sfndeploy.py

As an end-user this module is not relevant to you. You do not need to copy it
alongside sfndeploy.py.

If you are coding changes to sfndeploy.py, this test module is useful during
the development phase.
"""
import unittest
from unittest.mock import call, patch, MagicMock

import sfndeploy


class LinearTests(unittest.TestCase):

    def test_linear_increment_10_interval_10(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        linear = sfndeploy.Linear(increment=10, interval=10)
        linear.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [
                             call(old_weight=90, new_weight=10),
                             call(old_weight=80, new_weight=20),
                             call(old_weight=70, new_weight=30),
                             call(old_weight=60, new_weight=40),
                             call(old_weight=50, new_weight=50),
                             call(old_weight=40, new_weight=60),
                             call(old_weight=30, new_weight=70),
                             call(old_weight=20, new_weight=80),
                             call(old_weight=10, new_weight=90),
                             call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10),
                          call(alias_mock, 10)])

    def test_linear_increment_30_interval_12(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        linear = sfndeploy.Linear(increment=30, interval=12)
        linear.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [
                             call(old_weight=70, new_weight=30),
                             call(old_weight=40, new_weight=60),
                             call(old_weight=10, new_weight=90),
                             call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 12),
                          call(alias_mock, 12),
                          call(alias_mock, 12),
                          call(alias_mock, 12)])

    def test_linear_increment_90_interval_0(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        linear = sfndeploy.Linear(increment=90, interval=0)
        linear.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [
                             call(old_weight=10, new_weight=90),
                             call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 0),
                          call(alias_mock, 0)])

    def test_linear_increment_100_interval_0(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        linear = sfndeploy.Linear(increment=100, interval=0)
        linear.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [
                             call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 0)])

    def test_linear_increment_500_interval_2(self):
        with self.assertRaises(ValueError) as err:
            sfndeploy.Linear(increment=500, interval=2)

        self.assertEqual(str(err.exception), 'increment must be <=100.')


class CanaryTests(unittest.TestCase):

    def test_canary_increment_100_interval_2(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        canary = sfndeploy.Canary(increment=100, interval=2)
        canary.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [
                             call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 2)])

    def test_canary_increment_10_interval_2(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        canary = sfndeploy.Canary(increment=10, interval=2)
        canary.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [
                             call(old_weight=90, new_weight=10),
                             call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 2)])

    def test_canary_increment_negative_interval_2(self):
        with self.assertRaises(ValueError) as err:
            sfndeploy.Canary(increment=-1, interval=2)

        self.assertEqual(str(err.exception), 'increment must be >1.')


class AllAtOnceTests(unittest.TestCase):

    def test_all_at_once_interval_2(self):
        alias_mock = MagicMock()
        alarm_mock = MagicMock()

        all_at_once = sfndeploy.AllAtOnce(increment=10, interval=2)
        all_at_once.deploy(alias=alias_mock, alarm_checker=alarm_mock)

        self.assertEqual(alias_mock.update_weights.mock_calls,
                         [call(old_weight=0, new_weight=100)])

        self.assertEqual(alarm_mock.check_alarms.mock_calls,
                         [call(alias_mock, 2)])


if __name__ == '__main__':
    unittest.main()
