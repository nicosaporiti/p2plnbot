//@ts-check
const { Community, Order, User } = require('../../../models')
const messages = require('../../messages')

exports.onCommunityInfo = async ctx => {
    const commId = ctx.match[1]
    const community = await Community.findById(commId)
    const userCount = await User.count({ default_community_id: commId })
    const orderCount = await getOrdersNDays(1, commId)
    const volume = await getVolumeNDays(1, commId)

    const rows = []
    rows.push([
        { text: 'Orders 24hs', callback_data: `none` },
        { text: orderCount, callback_data: `none` }
    ])
    rows.push([
        { text: 'Volume 24hs', callback_data: `none` },
        { text: `${volume} sats`, callback_data: `none` }
    ])
    rows.push([
        { text: 'Users', callback_data: `none` },
        { text: userCount, callback_data: `none` }
    ])
    rows.push([{
        text: 'Utilizar por defecto',
        callback_data: `setCommunity_${commId}`
    }])
    const text = `${community.name}\n@${community.group}`
    await ctx.reply(text, {
        reply_markup: { inline_keyboard: rows }
    })
}

exports.onSetCommunity = async ctx => {
    const tg_id = ctx.update.callback_query.from.id
    const default_community_id = ctx.match[1]
    const user = await User.findOneAndUpdate({ tg_id }, { default_community_id })
    //await ctx.reply(default_community_id + '\n' + JSON.stringify(user))
    await messages.operationSuccessfulMessage(ctx)
}

const getOrdersNDays = async function getOrdersNDays(days, community_id) {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - days * 24)
    const filter = {
        status: 'SUCCESS',
        created_at: {
            $gte: yesterday
        }
    }
    if (community_id) filter.community_id = community_id
    return Order.count(filter)
}
const getVolumeNDays = exports.getVolumeNDays = async function getVolumeNDays(days, community_id) {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - days * 24)
    const filter = {
        status: 'SUCCESS',
        created_at: {
            $gte: yesterday
        }
    }
    if (community_id) filter.community_id = community_id
    const [row] = await Order.aggregate([{
        $match: filter
    }, {
        $group: {
            _id: null,
            amount: { $sum: "$amount" },
            routing_fee: { $sum: "$routing_fee" },
            fee: { $sum: "$fee" },
        }
    }])
    if (!row) return 0
    return row.amount
}