CREATE TABLE IF NOT EXISTS `monitoring` (
  `dttm` datetime NOT NULL COMMENT 'Время записи',
  `programm` varchar(50) NOT NULL COMMENT 'Программа',
  `worker` tinyint(3) NOT NULL DEFAULT '0' COMMENT 'Номер сущности',
  `type` varchar(50) NOT NULL DEFAULT '' COMMENT 'Тип операции (класс)',
  `function` varchar(50) NOT NULL DEFAULT '' COMMENT 'Выполняемая функция',
  `maxValue` int(10) unsigned NOT NULL COMMENT 'Максимальное время выполнения в мс',
  `minValue` int(10) unsigned NOT NULL COMMENT 'Минимальное время выполнения в мс',
  `counter` int(10) unsigned NOT NULL COMMENT 'Количество выполнений',
  `sumValue` int(10) unsigned NOT NULL COMMENT 'Общее время выполнения в мс',
  PRIMARY KEY (`programm`,`dttm`,`worker`,`type`,`function`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Функциональный мониторинг нагрузки';

