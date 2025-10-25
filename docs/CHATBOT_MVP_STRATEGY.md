# 🤖 Chatbot MVP Strategy: FAQ-First, Videos Later

**Last Updated:** October 23, 2025  
**Status:** Planning Phase

## 📋 Executive Summary

Build a context-aware AI chatbot that can answer user questions about their Social Security calculations by:
1. Starting with a curated FAQ database covering the top 25 most common questions
2. Adding short-form video explanations incrementally as questions are validated
3. Using the 80/20 rule: ~25 answers will cover ~80% of user questions

**Timeline:** 4 weeks to MVP launch  
**Cost:** ~$10-20/month for API usage (GPT-4)

---

## 🎯 The 25 Core Questions

### **Category 1: Filing Strategy (8 questions)**

1. **"When should I file for Social Security?"**
   - Answer framework: Health, income needs, survivor benefits, break-even analysis
   
2. **"Should I file at 62 or wait until 67/70?"**
   - Personalized break-even based on user's PIA data
   
3. **"I won't live that long, why wait?"** ⭐ PRIORITY VIDEO
   - Life expectancy misconception (65 → mid-80s, not 78)
   - Survivor benefit protection for spouse
   
4. **"What's the 'break-even age'?"**
   - Calculate from their specific data
   
5. **"Can I file early and then switch later?"**
   - No, it's permanent (except special widow/divorced rules)
   
6. **"Should I file early and invest the difference?"**
   - Math rarely works, SS = guaranteed inflation-adjusted annuity
   
7. **"What if I'm still working at 62?"**
   - Earnings test + impact on benefits
   
8. **"Does it matter what my spouse does?"**
   - Coordinated filing strategies

### **Category 2: Terminology Confusion (5 questions)**

9. **"What does 'retire' actually mean?"** ⭐ PRIORITY VIDEO
   - Stop working (any age) vs. file for benefits (62-70)
   
10. **"What's Full Retirement Age (FRA)?"**
    - Birth year table + benefit implications
    
11. **"What's the difference between PIA and my benefit?"**
    - PIA = at FRA, benefit = adjusted by filing age
    
12. **"What are spousal benefits?"**
    - 50% of higher earner's PIA, NOT in addition to own
    
13. **"What does 'early filing penalty' mean?"**
    - Permanent reduction, not temporary

### **Category 3: Working & Earnings (5 questions)**

14. **"Should I keep working part-time after 62?"** ⭐ PRIORITY VIDEO
    - Impact on PIA + earnings test
    
15. **"What's the 'double hit' when I stop working?"** ⭐ PRIORITY VIDEO
    - Earnings gap penalty + early filing penalty
    
16. **"How do zero earning years affect me?"** ⭐ PRIORITY VIDEO
    - Personalized calculation showing cost
    
17. **"Can I work while collecting Social Security?"**
    - Earnings test before FRA, no limit after
    
18. **"Will working longer increase my benefits?"**
    - If replaces low/zero years, yes (show math)

### **Category 4: Survivor & Spousal (4 questions)**

19. **"What happens to my spouse if I die first?"**
    - Survivor gets higher of the two benefits
    
20. **"Should the higher earner delay filing?"**
    - Usually yes, maximizes survivor benefit
    
21. **"Can I collect on my ex-spouse's record?"**
    - Divorced calculator rules (10 year requirement)
    
22. **"Can my spouse file early while I delay?"**
    - Yes, independent decisions (mostly)

### **Category 5: Special Situations (3 questions)**

23. **"I have a pension, how does WEP/GPO affect me?"**
    - Windfall Elimination / Government Pension Offset
    
24. **"Can I 'undo' filing early?"**
    - Withdrawal (12 months) vs. suspension (FRA+)
    
25. **"Should I apply for spousal or my own?"**
    - SSA automatically gives higher amount

---

## 🏗️ Technical Architecture

### **Phase 1: FAQ Database Structure**

```python
FAQ_DATABASE = {
    "wont_live_long": {
        "triggers": [
            "won't live that long",
            "die early", 
            "not going to make it",
            "life expectancy",
            "break even"
        ],
        "answer_template": """
I hear this concern often. Let me address it with two critical points:

**1. Life Expectancy Misconception**
The headline number (78 years average) doesn't apply to you.
If you reach 65 in reasonably good health:
• Your individual life expectancy jumps to mid-to-late 80s
• In a couple, there's a 50% chance one of you lives to 92
• The "break-even" age is typically 78-80, well within probable lifespan

**2. Survivor Benefits - The Real Reason to Wait**
Even if you pass away early:
• Your spouse will lose their own benefit but keep YOURS
• If you have the higher PIA, it becomes their lifetime income
• Filing early permanently reduces what your spouse receives

**Based on your data:**
{user_context}

This isn't just about you living longer - it's protecting your spouse's 
financial security for potentially 20-30 years after you're gone.

{video_placeholder}
        """,
        "related_questions": [
            "When should I file?",
            "Should the higher earner delay?",
            "Break-even calculation"
        ],
        "video": None  # Will be populated as videos are created
    },
    
    "retire_vs_file": {
        "triggers": [
            "when should i retire",
            "retire at 62",
            "early retirement", 
            "stop working"
        ],
        "answer_template": """
I notice you used "retire" - let me clarify a CRITICAL distinction:

**Two Separate Decisions:**

🛑 **Stopping Work** = You choose ANY age (55, 60, 62, 65, 70, 75...)
   • Your personal choice
   • Affects: income, lifestyle, stress, health
   • Can happen any time

💰 **Filing for Social Security** = You choose age 62-70
   • Determines monthly benefit for LIFE
   • Earlier = smaller check forever
   • Later = bigger check forever
   • Cannot be easily changed

**Common Trap:**
Many think "retire at 62" means both. But you could:
• Stop working at 55, file at 70 (live on savings)
• Keep working part-time at 65, delay filing to 70
• Stop working at 62, but wait to file until 67

**Which were you asking about:**
1. When to stop working?
2. When to file for Social Security?
3. Both at the same time?

{video_placeholder}
        """,
        "related_questions": [
            "What's the double hit?",
            "Can I work while collecting?",
            "Earnings test explained"
        ],
        "video": None
    },
    
    "double_hit": {
        "triggers": [
            "double hit",
            "stop working at 62",
            "retire and file at 62",
            "earnings gap"
        ],
        "answer_template": """
The "double hit" is why retiring AND filing at 62 costs more than most expect:

**Hit #1: Early Filing Penalty (~30%)**
Filing at 62 vs FRA (67) permanently reduces your benefit by ~30%

**Hit #2: Earnings Gap Penalty**
SSA assumes you keep earning until FRA (67). If you stop at 62:
• Ages 62-67 become ZEROS in your top-35 earnings
• This LOWERS your PIA before the early filing penalty

**Example with Your Data:**
{user_context}

**The Math:**
SSA Estimate at 67: $2,834/month

Most People Think:
$2,834 × 70% (filing at 62) = $1,983/month ❌

Reality - The Double Hit:
1. Earnings gap drops PIA by ~$366
2. Then apply early filing: ($2,834 - $366) × 70% = $1,728/month ✅

**You lose $255/month = $76,500 over 25 years**

**Solution:** Work part-time ages 62-67, or delay filing while living on savings

{video_placeholder}
        """,
        "related_questions": [
            "Should I keep working?",
            "What if I file early?",
            "Zero years impact"
        ],
        "video": None
    }
    
    # ... Add all 25 FAQs following this pattern
}
```

### **Phase 2: Question Router**

```python
async def route_question(question: str, user_context: dict):
    """
    Smart routing: FAQ match → LLM fallback → Escalation
    """
    question_lower = question.lower()
    
    # Try FAQ matching first
    for faq_key, faq_data in FAQ_DATABASE.items():
        for trigger in faq_data['triggers']:
            if trigger in question_lower:
                # FAQ match found!
                answer = faq_data['answer_template'].format(
                    user_context=format_user_context(user_context),
                    video_placeholder=format_video(faq_data['video'])
                )
                return {
                    "answer": answer,
                    "matched_faq": faq_key,
                    "confidence": "high",
                    "related_questions": faq_data['related_questions']
                }
    
    # No FAQ match - use LLM with context
    llm_response = await ask_llm_with_context(question, user_context)
    
    if llm_response['confidence'] >= 0.7:
        return llm_response
    else:
        # Low confidence - escalate
        return await escalate_to_human(question, user_context)

def format_user_context(context: dict) -> str:
    """
    Format user's calculator data for personalized answers
    """
    return f"""
**Your Current Data:**
• Birth Year: {context['birthYear']} (FRA: {calculate_fra(context['birthYear'])})
• Current PIA: ${context['pia']:,.0f}/month
• Earnings Years: {context['nonZeroYears']}
• Zeros in Top-35: {context['zerosInTop35']}
{f"• What-If PIA: ${context['whatIfPIA']:,.0f} ({context['whatIfDiff']:+.0f}/month)" if context.get('whatIfPIA') else ""}
    """

def format_video(video_data):
    """
    Format video recommendation if available
    """
    if not video_data:
        return ""
    
    return f"""
📺 **Watch: "{video_data['title']}"** ({video_data['duration']})
{video_data['description']}
[Watch Now →]({video_data['url']})
    """
```

### **Phase 3: Escalation System**

```python
async def escalate_to_human(question: str, context: dict):
    """
    When AI can't answer confidently, log and provide fallback
    """
    # Log for admin review
    await supabase.from('unanswered_questions').insert({
        'question': question,
        'user_context': context,
        'timestamp': datetime.now(),
        'status': 'needs_review'
    })
    
    # Honest response to user
    return {
        "answer": """
🤔 I want to make sure I give you accurate information, but I'm not fully 
confident I understand your specific situation.

**Here's what might help:**
• Post this in our Circle Community expert forum
• Review these related topics that might address your question
• Your question has been logged for our team to create better resources

**Related topics you might find helpful:**
{suggest_related_topics(question)}

Is there a simpler version of this I can help with?
        """,
        "confidence": "low",
        "escalated": True
    }
```

---

## 📊 Video Integration Roadmap

### **Tier 1: Create First (Weeks 1-2)**
1. ✅ "I Won't Live That Long" - Why survivor benefits matter
2. ✅ "'Retire' vs 'File'" - Critical terminology distinction
3. ✅ "The Double Hit Explained" - Earnings gap + early filing
4. ✅ "Zero Years Impact" - How they reduce your PIA
5. ✅ "Should I Keep Working?" - Part-time benefits

### **Tier 2: High Priority (Weeks 3-4)**
6. "What Are Spousal Benefits?" - Not free money
7. "Working While Collecting" - Earnings test
8. "Survivor Benefits Explained" - What spouse gets
9. "Break-Even Age Calculator" - When delayed filing pays off
10. "Full Retirement Age Table" - Birth year lookup

### **Tier 3: As Needed (Month 2+)**
Based on actual question analytics from launched chatbot

### **Video Metadata Schema**

```javascript
{
  id: "uuid",
  title: "Why 'I Won't Live That Long' Misses the Point",
  description: "Survivor benefits mean filing strategy matters even if you die early",
  circle_url: "https://circle.so/video/123",
  thumbnail_url: "https://...",
  duration: "3:24",
  
  // For FAQ matching
  faq_keys: ["wont_live_long", "survivor_benefits"],
  
  // For search
  tags: ["life-expectancy", "survivor-benefits", "filing-strategy"],
  transcript_summary: "Video explains that...",
  
  difficulty_level: "beginner",
  created_at: "2024-11-01",
  view_count: 0
}
```

---

## 🚀 Implementation Timeline

### **Week 1: Foundation**
- [ ] Write all 25 FAQ answer templates
- [ ] Build FAQ database structure (Python dict)
- [ ] Create simple keyword matching router
- [ ] Build `/api/ask` endpoint
- [ ] Test FAQ matching accuracy (aim for 80%+ match rate)

### **Week 2: UI & Integration**
- [ ] Design chat UI component with React
- [ ] Add "💬 Ask AI" button to each calculator
- [ ] Display suggested questions from FAQ database
- [ ] Show related questions after answers
- [ ] Test full user flow

### **Week 3: Intelligence & Analytics**
- [ ] Add OpenAI fallback for non-FAQ questions
- [ ] Implement confidence scoring
- [ ] Build escalation workflow
- [ ] Add analytics tracking (question logs)
- [ ] Create admin dashboard for question review

### **Week 4: Video Integration & Launch**
- [ ] Record first 3 priority videos
- [ ] Add video metadata to Supabase
- [ ] Update FAQ entries with video links
- [ ] Test video display in chat responses
- [ ] Beta launch to 10-20 users
- [ ] Monitor analytics and adjust

---

## 💰 Cost Analysis

**Monthly Costs:**
- OpenAI API (GPT-4): ~$10-20/month (1,000 questions)
- Supabase (analytics storage): Free tier sufficient
- Circle video hosting: Already included

**Development Time:**
- Week 1-2: Build chatbot (20 hours)
- Week 3-4: Record/integrate videos (10 hours)
- **Total: ~30 hours to MVP**

---

## 📈 Success Metrics

**Week 1-2 (Post-Launch):**
- FAQ match rate > 75%
- User satisfaction rating (thumbs up/down)
- Questions per user (engagement)

**Month 1:**
- Identify top 10 most-asked questions
- Create videos for top 5 unmet needs
- Reduce escalation rate to <10%

**Month 2-3:**
- FAQ coverage reaches 90%+
- Average confidence score > 0.8
- Video view-through rate > 60%

---

## 🎯 Escalation Process

### **When to Escalate**
1. **No FAQ Match** + **LLM Confidence < 0.7**
2. **User Says "That's Wrong"** - immediate escalation
3. **Complex Scenarios** - WEP, GPO, disability, etc.

### **Escalation Response**
```
🤔 I want to be certain I give you accurate information, but I'm not 
fully confident about your specific situation.

**Your question has been logged for our team.**

Meanwhile, consider:
• Posting in Circle Community expert forum
• Reviewing these related topics: [links]
• Scheduling a 1-on-1 if you need immediate help

Is there a simpler version I can help with right now?
```

### **Admin Dashboard**
**Daily Email Digest:**
```
Subject: Chatbot Needs Your Help - 12 Unanswered Questions

Top Unanswered This Week:
1. "WEP/GPO with government pension" (5 asks) → Create FAQ
2. "Divorced after 9 years" (3 asks) → Add to divorced FAQ
3. "Claim on disabled child's record" (2 asks) → Out of scope?

[View Dashboard →]
```

**Review Actions:**
- ✅ Create new FAQ
- 🎥 Make video
- 📝 Add to existing FAQ
- ❌ Mark out of scope

---

## 🔄 Continuous Improvement Loop

```
Launch → Collect Questions → Review Weekly → 
Add FAQs/Videos → Improve Coverage → Repeat
```

**Monthly Cycle:**
1. Review top 10 unanswered questions
2. Add 3-5 new FAQs
3. Create 1-2 new videos
4. Update existing answers based on user feedback
5. Gradually increase coverage from 80% → 95%+

---

## 📱 UI/UX Design

### **Chat Button**
```jsx
<button className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 
                   text-white px-6 py-3 rounded-full shadow-lg">
  💬 Ask About Your Benefits
</button>
```

### **Chat Interface**
- Context indicator: "📊 Analyzing: PIA Calculator (Primary)"
- Suggested questions (pull from FAQ)
- Related questions after each answer
- Video cards with thumbnails
- Thumbs up/down for feedback

### **Response Format**
```
[Answer text with user's specific data]

📺 Watch: "Video Title" (3:24)
[Description]
[Watch Now →]

❓ Related Questions:
• Question 1
• Question 2
• Question 3
```

---

## 🎬 Next Steps

1. **Review & Approve** this strategy
2. **Toggle to Act Mode** to begin implementation
3. **Start with:** Writing all 25 FAQ templates
4. **Then:** Build the routing logic
5. **Finally:** Integrate into calculators

**Questions?**
- Which LLM? (OpenAI GPT-4 recommended)
- Video format? (Screen recording, talking head, animation?)
- Launch to full users or beta group first?

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2025  
**Author:** AI Assistant (Cline)  
**Status:** Awaiting Approval
