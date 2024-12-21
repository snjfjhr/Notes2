static const int32 LANE_NUM = 2;
static const int32 JUDGE_Y = 500;
static const Array<Input> keys = {KeyF, KeyH};

class Note
{
    double _perfectTime;

    double _x;
    double _y;

    static const int32 _WIDTH = 50;
    static const int32 _HEIGHT = 20;

    Input _key;

public:
    Note(double p, double x, Input k) : _perfectTime(p), _x(x), _key(k) { }

    void update(double t)
    {
        // ノーツが画面に出現してから2秒で判定ラインに到達する
        _y = JUDGE_Y / 2 * (t - _perfectTime) + JUDGE_Y;
    }

    bool isErasable(double t)
    {
        if (-0.3 < (t - _perfectTime) && (t - _perfectTime) < 0.12 && _key.down())
        {
            return true;
        }

        // ノーツが判定ラインを超えてから2秒後に自身を消去
        if (2 < (t - _perfectTime))
        {
            return true;
        }

        return false;
    }

    void draw() const
    {
        Rect((int32)_x - _WIDTH / 2, (int32)_y - _HEIGHT / 2, _WIDTH, _HEIGHT).draw(Palette::Greenyellow);
    }
};

class Humen
{
    double _bpm = 120;
    double _offset = 0;

public:
    Array<Array<double>> perfectTimes;

    Humen()
    {
        for (size_t i = 0; i < LANE_NUM; i++)
        {
            perfectTimes << Array<double>();
        }
    }

    void load()
    {
        TextReader reader(U"fumen_cancan_michiyuki.txt");

        if (!reader)
        {
            throw Error(U"Failed to open Fumen");
        }

        String line;

        while (reader.readLine(line))
        {
            auto list = line.split(':');

            if (list[0] == U"#START")
            {
                break;
            }

            if (list[0] == U"BPM")
            {
                _bpm = Parse<double>(list[1]);
            }
            else if (list[0] == U"OFFSET")
            {
                _offset = Parse<double>(list[1]);
            }
        }

        for (size_t row = 0; reader.readLine(line); row++)
        {
            auto list = line.split(',');

            for (auto col : step(list.size()))
            {
                String word = list[col];

                for (auto i : step(word.size()))
                {
                    if ('1' <= word[i] && word[i] <= '9')
                    {
                        perfectTimes[col] << 60 * 4 * (row + (double)i / word.size()) / _bpm - _offset;
                    }
                }
            }
        }
    }
};

class NoteManager
{
    Array<Array<Note>> _notesList;

public:
    NoteManager()
    {
        for (size_t i = 0; i < LANE_NUM; i++)
        {
            _notesList << Array<Note>();
        }

        Humen humen;

        humen.load();

        for (auto laneNum : step(LANE_NUM))
        {
            for (auto i : step(humen.perfectTimes[laneNum].size()))
            {
                _notesList[laneNum] << Note(humen.perfectTimes[laneNum][i], 140 + 90 * laneNum, keys[laneNum]);
            }
        }
    }

    void update(double t)
    {
        for (auto& notes : _notesList)
        {
            for (auto& note : notes)
            {
                note.update(t);
            }
        }

        for (auto& notes : _notesList)
        {
            for (auto it = notes.begin(); it != notes.end(); it++)
            {
                // 消去フラグが立っていたら消去
                if ((*it).isErasable(t))
                {
                    it = notes.erase(it);
                    break;
                }
            }
        }
    }

    void draw() const
    {
        //String str = U"";
        for (const auto& notes : _notesList)
        {
            for (const auto& note : notes)
            {
                note.draw();
            }
            //str += Format(notes.size()) + U" ";
        }
        //ClearPrint();
        //Print << str;
    }
};

class Game
{
    NoteManager _noteManager;

    const Array<String> _strKeys = { U"F", U"H"};

    const Font _keyFont{ 50 };
    const Font _titleFont{ 26 };
    const Font _versionFont{ 16 };

public:
    Game()
    {
        AudioAsset(U"BGM").play();

        Scene::SetBackground(ColorF(0.5, 0.6, 0.7));
    }

    void update()
    {
        _noteManager.update(AudioAsset(U"BGM").posSec());
    }

    void draw() const
    {
        for (auto i : step(LANE_NUM))
        {
            Rect(100 + i * 90, 0, 80, 600).draw(Palette::White);
        }

        Line(80, JUDGE_Y, 300, JUDGE_Y).draw(4, Palette::Blue);

        _titleFont(U"龍囃子").drawAt(Vec2(400, 270), Palette::White);
        _versionFont(U"大太鼓").drawAt(Vec2(400, 300), Palette::White);

        for (auto i : step(LANE_NUM))
        {
            if (keys[i].down())
            {
                AudioAsset(U"Sound").playOneShot();
            }
        }

        for (auto i : step(LANE_NUM))
        {
            Color keyColor;

            keyColor = keys[i].pressed() ? Palette::Skyblue : Palette::Gray;

            _keyFont(_strKeys[i]).drawAt(Vec2(140 + 90 * i, 570), keyColor);
        }

        _noteManager.draw();
    }
};

bool Button(const Rect& rect, const Font& font, const String& text, bool enabled)
{
    if (enabled && rect.mouseOver())
    {
        Cursor::RequestStyle(CursorStyle::Hand);
    }

    if (enabled)
    {
        rect.draw(ColorF{ 0.3, 0.7, 1.0 });
        font(text).drawAt(40, (rect.x + rect.w / 2), (rect.y + rect.h / 2));
    }
    else
    {
        rect.draw(ColorF{ 0.5 });
        font(text).drawAt(40, (rect.x + rect.w / 2), (rect.y + rect.h / 2), ColorF{ 0.7 });
    }

    return (enabled && rect.leftClicked());
}

void Main()
{
    Window::SetTitle(U"龍囃子");
    
    const Font font{ FontMethod::MSDF, 48, Typeface::Bold };

    while (System::Update())
    {
        font(U"楽器を選んでください").draw(160, 80, Palette::White);
        if (Button(Rect{ 250, 200, 300, 80 }, font, U"大太鼓", true))
        {
            AudioAsset::Register(U"BGM", U"Michiyuki_NoTaiko.wav");
            AudioAsset::Register(U"Sound", U"Taiko1Note.wav");

            Game game;

            while (System::Update())
            {
                game.update();

                game.draw();
            }
        }
        
        if (Button(Rect{ 250, 300, 300, 80 }, font, U"パラパラ", true))
        {
            AudioAsset::Register(U"BGM", U"Michiyuki_NoParapara.wav");
            AudioAsset::Register(U"Sound", U"Parapara1Note.wav");

            Game game;

            while (System::Update())
            {
                game.update();

                game.draw();
            }
        }
        
        if (Button(Rect{ 250, 400, 300, 80 }, font, U"キャンキャン", true))
        {
            AudioAsset::Register(U"BGM", U"Michiyuki_NoCancan.wav");
            AudioAsset::Register(U"Sound", U"Cancan1Note.wav");

            Game game;

            while (System::Update())
            {
                game.update();

                game.draw();
            }
        }
    }

    //AudioAsset::Register(U"BGM", U"Michiyuki_NoTaiko.wav");
    //AudioAsset::Register(U"Sound", U"Taiko1Note.wav");

    //Game game;

    //while (System::Update())
    //{
        //game.update();

        //game.draw();
    //}
}
