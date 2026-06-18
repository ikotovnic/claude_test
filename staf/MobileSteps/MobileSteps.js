import cn from 'classnames'
import { useState } from 'react';
import { ShortRoute } from '../Popups/ShortRoute/ShortRoute';
import { ShowProject } from '../Popups/ShowProject/ShowProject';
import styles from './MobileSteps.module.scss'

export const MobileSteps = () => {
    const [isCollapse, setIsCollapse] = useState(false);

    return (
        <>
            <div className={styles.block}>
                <img src="/uxBlockBackgrounds/first.png" alt="" />
                    <div className={cn(styles.steps, styles.first)}>
                        <div className={styles.step}>
                            <span className={styles.id}>01</span>
                            <div className={styles.infoblock}>
                               <h3 className={styles.title}>Первая <br /> встреча и <br /> погружение <br /> в ваш мир </h3>
                                <p>Все начинается с живого разговора. Мы задаем вопросы: зачем вам аудит? Что болит в бизнесе? Расскажите о них клиентам, интересующимся сайтом. Вы делитесь данными (аналитика, отзывы, метрики). Мы слушаем, фиксируем боли и цели.</p>
                            </div>
                        </div>
                        <div className={styles.step}>
                            <span className={styles.id}>02</span>
                            <div className={styles.infoblock}>
                                <h3 className={styles.title}>Подготовка <br /> комментариев <br /> и <br /> анализ <br /> контекста</h3>
                                <p>После встречи мы готовим персональные комментарии. Это краткий обзор: ваши сильные стороны, первые инсайты среди конкурентов. Мы изучаем ЦА (портреты, боли, привычки), анализируем 5–10 топ-конкурентов (их UX, сильные/слабые метрики).</p>
                            </div>
                        </div>
                    </div>
            </div>
            
            <div className={cn(
                styles.collapsibleBlocks, 
                { 
                    [styles.collapsed]: isCollapse,
                    [styles.expanded]: !isCollapse
                }
            )}>
                <div className={styles.block}>
                    <img src="/uxBlockBackgrounds/second.png" alt="" className={styles.second} />
                    <div className={cn(styles.steps, styles.first)}>
                        <div className={styles.step}>
                            <span className={styles.id}>03</span>
                            <div className={styles.infoblock}>
                                <h3 className={styles.title}>Глубокий<br /> анализ<br /> целей сайта</h3>
                                <p>Переходим в среду аудита (этап 2 методики). Изучаем ваши данные (Яндекс Метрика, тепловые карты, сеансы), интерфейс и путь пользователя. Находим "узкие горлышки": где улучшить аудиторию? Что мешает удобству? Тестируем ключевые ресурсы (покупка, регистрация, поиск).</p>
                            </div>
                        </div>
                        <div className={styles.step}>
                            <span className={styles.id}>04</span>
                            <div className={styles.infoblock}>
                                <h3 className={styles.title}>Финальный<br /> отчет и план <br /> действий</h3>
                                <p>Компактный отчет: краткое описание для вас, детальный анализ для команды.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.block}>
                    <div className={cn(styles.steps, styles.first)}>
                        <div className={styles.step}>
                            <span className={styles.id}>05</span>
                            <div className={styles.infoblock}>
                                <h3 className={styles.title}>Генерация<br /> идей для<br /> изменений</h3>
                                <p>Этап 3 методологии – креатив на данных. Предлагаем идеи: от микроулучшений (кнопки, навигация) до редизайн-сценариев. Каждый пункт с обоснованием, примерами.<br /><br /> Визуализируем в Figma: скриншоты “до/после”.</p>
                            </div>
                        </div>
                        <div className={styles.step}>
                            <span className={styles.id}>06</span>
                            <div className={styles.infoblock}>
                                <h3 className={styles.title}>Идентификация<br /> болей и <br /> "горячих зон"</h3>
                                <p>Детальный разбор: тепловые карты покажут, клиенты куда “не кликают”. Мы фиксируем проблемы по шкале приоритетов (критически/срочно/опционально).</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isCollapse && (
                <div
                    className={styles.button}
                    onClick={() => setIsCollapse(false)}
                >
                    Смотреть
                </div>
            )}
        </>
    );
}